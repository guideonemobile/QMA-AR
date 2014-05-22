
#import "QMAOnSiteVC.h"
#import <AVFoundation/AVFoundation.h>
#import "QMACyclopsVC.h"


@interface QMAOnSiteVC ()

@property (nonatomic, weak) IBOutlet UIView *cameraFeedView;
@property (nonatomic, weak) IBOutlet UIToolbar *toolbar; //Used for blur effect
@property (nonatomic, weak) IBOutlet UIActivityIndicatorView *spinner;
@property (nonatomic, weak) IBOutlet UILabel *arLabel;
@property (nonatomic, strong) NSString *arLabelString;

@property (nonatomic, strong) AVCaptureSession *session;
@property (nonatomic, strong) AVCaptureVideoPreviewLayer *cvpl;

@end


@implementation QMAOnSiteVC {
    
    BOOL _initialized;
    
}

- (AVCaptureSession *)session {
    if (!_session) {
        _session = [[AVCaptureSession alloc] init];
        _session.sessionPreset = AVCaptureSessionPresetHigh;
    }
    return _session;
}

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    [super viewDidLoad];
    self.arLabelString = self.arLabel.text;
    self.arLabel.text = @"";
    self.arLabel.textColor = [UIColor whiteColor];
    //QMALog(@"%@", self.navigationController.viewControllers);
}

- (void)viewWillAppear:(BOOL)animated {
    [super viewWillAppear:animated];
    if (!_initialized) {
        _initialized = YES;
        [self initializeCamera];
    }
    self.toolbar.frame = self.cameraFeedView.frame;
}

#pragma mark - Camera Feed

- (void) initializeCamera {
	
	self.cvpl = [[AVCaptureVideoPreviewLayer alloc] initWithSession:self.session];
    self.cvpl.videoGravity = AVLayerVideoGravityResizeAspectFill;
	self.cvpl.frame = self.cameraFeedView.bounds;
	[self.cameraFeedView.layer addSublayer:self.cvpl];
	
    CALayer *viewLayer = [self.cameraFeedView layer];
    [viewLayer setMasksToBounds:YES];
    
    NSArray *devices = [AVCaptureDevice devices];
    AVCaptureDevice *backCamera;
    
    for (AVCaptureDevice *device in devices) {
        if ([device hasMediaType:AVMediaTypeVideo]) {
            if (device.position == AVCaptureDevicePositionBack) {
                backCamera = device;
            }
        }
    }
    
    NSError *error;
    AVCaptureDeviceInput *input = [AVCaptureDeviceInput deviceInputWithDevice:backCamera error:&error];
    if (!input) {
        QMALog(@"ERROR trying to open camera: %@", error);
    } else {
        [self.session addInput:input];
        [self performSelector:@selector(startCameraFeed) withObject:nil afterDelay:0.2]; //Without the delay, self.cvpl.connection.supportsVideoOrientation always returns false
    }
}

- (void)startCameraFeed {
    
    [self adjustVideoOrientation];
    [self.session startRunning];
    
    self.arLabel.text = self.arLabelString;
    [self.spinner stopAnimating];
}

- (void)adjustVideoOrientation {
    if (self.cvpl.connection.supportsVideoOrientation) {
        if ([[UIDevice currentDevice] orientation] == UIInterfaceOrientationLandscapeLeft) {
            self.cvpl.connection.videoOrientation = AVCaptureVideoOrientationLandscapeLeft;
        } else if ([[UIDevice currentDevice] orientation] == UIInterfaceOrientationLandscapeRight) {
            self.cvpl.connection.videoOrientation = AVCaptureVideoOrientationLandscapeRight;
        } else {
            QMALog(@"ERROR: Portrait orientation is not supported");
        }
    } else {
        QMALog(@"ERROR: Video orientation is not supported");
    }
}

#pragma mark - Device Rotation

- (void)willAnimateRotationToInterfaceOrientation:(UIInterfaceOrientation)toInterfaceOrientation duration:(NSTimeInterval)duration {
    [self adjustVideoOrientation];
}

#pragma mark - Target Action

- (IBAction)didTapToSeePanorama:(UIButton *)sender {
    self.arLabel.text = @"";
    [self.spinner startAnimating];
    //AVCaptureSession's stopRunning is synchronous and takes a long time to run.
    //Without dispatching it to run in the background, it would block the UI for a couple of seconds
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self.session stopRunning];
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.spinner stopAnimating];
            [self performSegueWithIdentifier:@"SegueToPanorama" sender:self];
        });
    });
}

#pragma mark - Segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    if ([segue.destinationViewController respondsToSelector:@selector(setManagedDocument:)]) {
        [(id)segue.destinationViewController setManagedDocument:self.managedDocument];
    }
}

@end
