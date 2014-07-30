
#import "QMAPoiVC.h"
#import "QMAPoi.h"
#import "QMATarget.h"
#import <QuartzCore/QuartzCore.h>
#import <AVFoundation/AVFoundation.h>
#import "DACircularProgressView.h"
#import "QMAGalleryVC.h"


@interface QMAPoiVC () <AVAudioPlayerDelegate>

@property (nonatomic, weak) IBOutlet UIView *frameView;
@property (nonatomic, weak) IBOutlet UIImageView *mainImageView;
@property (nonatomic, weak) IBOutlet UILabel *poiLabel;
@property (nonatomic, weak) IBOutlet UILabel *boroughLabel;
@property (nonatomic, weak) IBOutlet UILabel *personNameLabel;
@property (nonatomic, weak) IBOutlet DACircularProgressView *progressView;

@property (nonatomic, strong) AVAudioPlayer *audioPlayer;
@property (nonatomic, weak) NSTimer *timer;

@end


@implementation QMAPoiVC {
    
    BOOL _mainImageHasBeenMasked;
    
}

- (AVAudioPlayer *)audioPlayer {
    
    if (!_audioPlayer) {
        
        NSURL *url = [[NSBundle mainBundle] URLForResource:self.poi.audio withExtension:@"mp3"];
        NSError *error;
        
        _audioPlayer = [[AVAudioPlayer alloc] initWithContentsOfURL:url error:&error];
        _audioPlayer.delegate = self;
        
        if (error) {
            QMALog(@"Error loading audioPlayer: %@", [error localizedDescription]);
        } else {
            [_audioPlayer prepareToPlay];
        }
    }
    return _audioPlayer;
}

#pragma mark - View Controller Lifecycle

- (void)viewDidLoad {
    
    [super viewDidLoad];
    
    self.frameView.hidden = YES;
    self.mainImageView.image = [UIImage imageNamed:self.poi.image];
 
    self.poiLabel.text = self.poi.label;
    self.boroughLabel.text = [self.poi.borough uppercaseString];
    self.personNameLabel.text = self.poi.personName;
    
    self.progressView.roundedCorners = NO;
    self.progressView.thicknessRatio = 0.02;
}

- (void)viewWillAppear:(BOOL)animated {
    
    [super viewWillAppear:animated];
    
    if (!_mainImageHasBeenMasked) {
        
        _mainImageHasBeenMasked = YES;
        
        //Mask main image
        CALayer *mask = [CALayer layer];
        mask.contents = (id)[[UIImage imageNamed:@"poi_main_mask.png"] CGImage];
        mask.frame = CGRectMake(0, 0, self.mainImageView.frame.size.width, self.mainImageView.frame.size.height);
        self.mainImageView.layer.mask = mask;
        self.mainImageView.layer.masksToBounds = YES;
    }
}

#pragma mark - Audio Player

- (IBAction)toggleAudio:(UIButton *)sender {
    if (self.audioPlayer.playing) {
        [self.audioPlayer pause];
    } else {
        if (!self.timer) {
            [self.progressView setProgress:0.0 animated:NO];
            self.timer = [NSTimer scheduledTimerWithTimeInterval:0.1
                                                          target:self
                                                        selector:@selector(checkAudioPlaybackProgress:)
                                                        userInfo:nil
                                                         repeats:YES];
        }
        [self.audioPlayer play];
    }
}

- (void)checkAudioPlaybackProgress:(NSTimer *)timer {
    [self.progressView setProgress:self.audioPlayer.currentTime/self.audioPlayer.duration animated:YES];
}

#pragma mark - AVAudioPlayerDelegate

-(void)audioPlayerDidFinishPlaying:(AVAudioPlayer *)player successfully:(BOOL)flag {
    [self.timer invalidate];
}

#pragma mark - Public API

- (void)playAudio {
    if (self.audioPlayer.playing) {
        QMALog(@"Audio is already playing");
    } else {
        [self toggleAudio:nil];
    }
}

- (void)stopAudio {
    [self.timer invalidate];
    [self fadeVolume];
}

- (void)fadeVolume {
    self.audioPlayer.volume -= 0.05;
    if (self.audioPlayer.volume > 0) {
        [self performSelector:@selector(fadeVolume) withObject:nil afterDelay:0.06];
    } else {
        [self.audioPlayer stop];
        self.audioPlayer.currentTime = 0;
        self.audioPlayer.volume = 1;
        [self.progressView setProgress:0.0 animated:YES];
    }
}

#pragma mark - Segue

- (void)prepareForSegue:(UIStoryboardSegue *)segue sender:(id)sender {
    if ([segue.destinationViewController respondsToSelector:@selector(setPoi:)]) {
        [(id) segue.destinationViewController setPoi:self.poi];
    }
}

@end
