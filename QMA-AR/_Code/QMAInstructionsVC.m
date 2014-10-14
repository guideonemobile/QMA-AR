
#import "QMAInstructionsVC.h"
#import <AVFoundation/AVFoundation.h>


@interface QMAInstructionsVC ()

@property (nonatomic, weak) IBOutlet UIView *cameraFeedView;
@property (nonatomic, weak) IBOutlet UIActivityIndicatorView *spinner;

@property (nonatomic, strong) AVCaptureSession *session;
@property (nonatomic, strong) AVCaptureVideoPreviewLayer *cvpl;

@end


@implementation QMAInstructionsVC {
    
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

- (void)viewWillAppear:(BOOL)animated {
    
    [super viewWillAppear:animated];
    
    if (!_initialized) {
        _initialized = YES;
        [self initializeCamera];
    }
    
    [[UIDevice currentDevice] beginGeneratingDeviceOrientationNotifications];
    
    [[NSNotificationCenter defaultCenter] addObserver:self
                                             selector:@selector(adjustVideoOrientation)
                                                 name:UIDeviceOrientationDidChangeNotification
                                               object:[UIDevice currentDevice]];
}

- (void)viewWillDisappear:(BOOL)animated {
    [super viewWillDisappear:animated];
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

#pragma mark - Video Orientation

- (void)adjustVideoOrientation {
    if (self.cvpl.connection.supportsVideoOrientation) {
        if ([[UIDevice currentDevice] orientation] == UIInterfaceOrientationLandscapeLeft) {
            self.cvpl.connection.videoOrientation = AVCaptureVideoOrientationLandscapeLeft;
        } else if ([[UIDevice currentDevice] orientation] == UIInterfaceOrientationLandscapeRight) {
            self.cvpl.connection.videoOrientation = AVCaptureVideoOrientationLandscapeRight;
        }
    } else {
        QMALog(@"ERROR: Video orientation is not supported");
    }
}

#pragma mark - Camera Feed

- (void)initializeCamera {
	
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
}

#pragma mark - Target Action

static NSString *const kQMAURL = @"http://www.queensmuseum.org/pano";

- (IBAction)didTapToSeeWebSite:(UIButton *)sender {
    [[UIApplication sharedApplication] openURL:[NSURL URLWithString:kQMAURL]];
}

- (IBAction)didTapToViewPanorama:(UIButton *)sender {
    [self.spinner startAnimating];
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        [self.session stopRunning];
        dispatch_async(dispatch_get_main_queue(), ^{
            [self.spinner stopAnimating];
            [self performSegueWithIdentifier:@"GotoPanorama" sender:self];
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
